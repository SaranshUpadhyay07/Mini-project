import json
from typing import Any, Dict

from agents.editor_agent import build_edit_prompt, extract_edits
from agents.planner_agent import send as planner_send
from fastapi import APIRouter
from pydantic import BaseModel
from store.itinerary_store import store

router = APIRouter()


class PlannerRequest(BaseModel):
    user_id: str
    chat_id: str
    message: str


def _is_reset(message: str) -> bool:
    return (message or "").strip().upper() == "RESET"


def _parse_planner_json(raw: str) -> Dict[str, Any]:

    if raw is None:
        return {
            "ok": False,
            "error": "problem fetching itinerary right now. please try again.",
        }

    txt = (raw or "").strip()
    if not txt:
        return {
            "ok": False,
            "error": "problem fetching itinerary right now. please try again.",
        }

    try:
        obj = json.loads(txt)
    except json.JSONDecodeError:
        return {
            "ok": False,
            "error": "problem fetching itinerary right now. please try again.",
        }

    if not isinstance(obj, dict):
        return {
            "ok": False,
            "error": "problem fetching itinerary right now. please try again.",
        }

    return {"ok": True, "data": obj}


def _planner_send_json_with_retry(
    user_id: str, chat_id: str, message: str, *, retries: int = 3
) -> Dict[str, Any]:

    last_error: Dict[str, Any] | None = None

    for attempt in range(1, retries + 1):
        # On retries, prepend a stricter instruction.
        prompt = message
        if attempt > 1:
            prompt = (
                "Return ONLY valid JSON (no extra text). "
                "Do not use markdown. Output must be a JSON object.\n\n"
                f"USER_MESSAGE:\n{message}"
            )

        raw = planner_send(user_id, chat_id, prompt)
        parsed = _parse_planner_json(raw)
        if parsed.get("ok") is True:
            return parsed

        last_error = parsed

    return last_error or {
        "ok": False,
        "error": "problem fetching itinerary right now. please try again.",
    }


@router.post("/planner")
def planner_endpoint(request: PlannerRequest) -> Dict[str, Any]:
    user_id = request.user_id
    chat_id = request.chat_id
    msg = request.message or ""

    # Hard reset: drop stored itinerary + logs for this (user_id, chat_id).
    if _is_reset(msg):
        store.reset(user_id, chat_id, message=msg)
        return {"ok": True, "reset": True}

    # CREATE (first message in this chat thread)
    if not store.has_itinerary(user_id, chat_id):
        result = _planner_send_json_with_retry(user_id, chat_id, msg, retries=3)
        if result.get("ok") is not True:
            return {
                "ok": False,
                "error": result.get(
                    "error", "problem fetching itinerary right now. please try again."
                ),
            }

        itinerary = result["data"]

        store.set_itinerary(
            user_id=user_id,
            chat_id=chat_id,
            itinerary=itinerary,
            log_type="create",
            message=msg,
            data={},
        )
        return itinerary

    # EDIT (subsequent messages)
    current = store.get_itinerary(user_id, chat_id) or {}
    edits = extract_edits(msg)

    # Editor may also request reset.
    if edits.get("reset") is True:
        store.reset(user_id, chat_id, message=msg)
        return {"ok": True, "reset": True}

    edit_prompt = build_edit_prompt(
        current_itinerary=current,
        user_edit_request=msg,
        edits=edits,
    )

    result = _planner_send_json_with_retry(user_id, chat_id, edit_prompt, retries=3)
    if result.get("ok") is not True:
        return {
            "ok": False,
            "error": result.get(
                "error", "problem fetching itinerary right now. please try again."
            ),
        }

    updated = result["data"]

    store.set_itinerary(
        user_id=user_id,
        chat_id=chat_id,
        itinerary=updated,
        log_type="edit",
        message=msg,
        data={"edits": edits, "dirty_days": edits.get("dirty_days", [])},
    )

    return updated
