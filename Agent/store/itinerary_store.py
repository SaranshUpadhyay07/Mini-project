from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Tuple

Key = Tuple[str, str]  # (user_id, chat_id)


def _now_ms() -> int:
    return int(time.time() * 1000)


@dataclass
class ItinerarySession:
    version: int = 0
    itinerary: Optional[Dict[str, Any]] = None
    logs: list[dict[str, Any]] = field(default_factory=list)


class ItineraryStore:

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._sessions: Dict[Key, ItinerarySession] = {}

    def has_itinerary(self, user_id: str, chat_id: str) -> bool:
        with self._lock:
            s = self._sessions.get((user_id, chat_id))
            return bool(s and s.itinerary)

    def get_itinerary(self, user_id: str, chat_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            s = self._sessions.get((user_id, chat_id))
            return s.itinerary if s else None

    def set_itinerary(
        self,
        user_id: str,
        chat_id: str,
        itinerary: Dict[str, Any],
        log_type: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> int:
        with self._lock:
            key = (user_id, chat_id)
            session = self._sessions.get(key)
            if session is None:
                session = ItinerarySession()
                self._sessions[key] = session

            session.itinerary = itinerary
            session.version = int(session.version or 0) + 1
            session.logs.append(
                {
                    "ts_ms": _now_ms(),
                    "type": log_type,
                    "message": message,
                    "data": data or {},
                }
            )
            return session.version

    def reset(self, user_id: str, chat_id: str, message: str = "RESET") -> None:
        with self._lock:
            self._sessions.pop((user_id, chat_id), None)


# Singleton store instance used by routes.
store = ItineraryStore()
