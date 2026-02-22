import json
from typing import Any, Dict

from agents.editor_agent import build_edit_prompt, extract_edits
from agents.planner_agent import send as planner_send
from fastapi import APIRouter
from pydantic import BaseModel
from store.itinerary_store import store

FILE = "Agent/routes/planner_routes.py"


def _log(fn: str, message: str) -> None:
    print(f"[{FILE}] [{fn}] {message}", flush=True)


router = APIRouter()


class PlannerRequest(BaseModel):
    user_id: str
    chat_id: str
    message: str


def _is_reset(message: str) -> bool:
    _log("_is_reset", "entry")
    result = (message or "").strip().upper() == "RESET"
    _log("_is_reset", f"exit result={result}")
    return result


def _parse_planner_json(raw: str) -> Dict[str, Any]:
    _log("_parse_planner_json", "entry")

    if raw is None:
        _log("_parse_planner_json", "branch raw_is_none")
        return {
            "ok": False,
            "error": "problem fetching itinerary right now. please try again.",
        }

    txt = (raw or "").strip()
    if not txt:
        _log("_parse_planner_json", "branch empty_text")
        return {
            "ok": False,
            "error": "problem fetching itinerary right now. please try again.",
        }

    try:
        obj = json.loads(txt)
    except json.JSONDecodeError:
        _log("_parse_planner_json", "branch json_decode_error")
        return {
            "ok": False,
            "error": "problem fetching itinerary right now. please try again.",
        }

    if not isinstance(obj, dict):
        _log("_parse_planner_json", f"branch invalid_type type={type(obj).__name__}")
        return {
            "ok": False,
            "error": "problem fetching itinerary right now. please try again.",
        }

    _log("_parse_planner_json", "exit ok")
    return {"ok": True, "data": obj}


def _planner_send_json_with_retry(
    user_id: str, chat_id: str, message: str, *, retries: int = 3
) -> Dict[str, Any]:
    _log(
        "_planner_send_json_with_retry",
        f"entry user_id={user_id} chat_id={chat_id} retries={retries}",
    )

    last_error: Dict[str, Any] | None = None

    for attempt in range(1, retries + 1):
        # On retries, prepend a stricter instruction.
        prompt = message
        if attempt > 1:
            _log("_planner_send_json_with_retry", f"branch retry attempt={attempt}")
            prompt = (
                "Return ONLY valid JSON (no extra text). "
                "Do not use markdown. Output must be a JSON object.\n\n"
                f"USER_MESSAGE:\n{message}"
            )

        _log("_planner_send_json_with_retry", f"model_call attempt={attempt}")
        raw = planner_send(user_id, chat_id, prompt)
        _log("_planner_send_json_with_retry", f"model_output_chars={len(raw or '')}")
        if raw:
            # Print the raw model output for terminal debugging as requested.
            print(
                f"[{FILE}] [_planner_send_json_with_retry] model_output_raw {raw}",
                flush=True,
            )

        parsed = _parse_planner_json(raw)
        if parsed.get("ok") is True:
            _log("_planner_send_json_with_retry", "exit ok")
            return parsed

        last_error = parsed
        _log("_planner_send_json_with_retry", "attempt_failed continuing")

    _log("_planner_send_json_with_retry", "exit failed")
    return last_error or {
        "ok": False,
        "error": "problem fetching itinerary right now. please try again.",
    }


@router.post("/planner")
def planner_endpoint(request: PlannerRequest) -> Dict[str, Any]:
    _log("planner_endpoint", "entry")
    user_id = request.user_id
    chat_id = request.chat_id
    msg = request.message or ""
    _log(
        "planner_endpoint",
        f"request user_id={user_id} chat_id={chat_id} message_chars={len(msg)}",
    )

    # Hard reset: drop stored itinerary + logs for this (user_id, chat_id).
    if _is_reset(msg):
        _log("planner_endpoint", "branch reset=true (hard)")
        store.reset(user_id, chat_id, message=msg)
        _log("planner_endpoint", "exit reset")
        return {"ok": True, "reset": True}

    # CREATE (first message in this chat thread)
    if not store.has_itinerary(user_id, chat_id):
        _log("planner_endpoint", "branch create (no itinerary in store)")
        result = _planner_send_json_with_retry(user_id, chat_id, msg, retries=3)
        if result.get("ok") is not True:
            _log("planner_endpoint", "exit error (create)")
            return {
                "ok": False,
                "error": result.get(
                    "error", "problem fetching itinerary right now. please try again."
                ),
            }

        itinerary = result["data"]
        _log("planner_endpoint", "store_set_itinerary (create)")

        store.set_itinerary(
            user_id=user_id,
            chat_id=chat_id,
            itinerary=itinerary,
            log_type="create",
            message=msg,
            data={},
        )
        _log("planner_endpoint", "exit success (create)")
        return itinerary

    # EDIT (subsequent messages)
    _log("planner_endpoint", "branch edit (itinerary exists)")
    current = store.get_itinerary(user_id, chat_id) or {}
    _log("planner_endpoint", "extract_edits (model_call groq) starting")
    edits = extract_edits(msg)
    _log(
        "planner_endpoint",
        f"extract_edits done reset={edits.get('reset')} dirty_days_count={len(edits.get('dirty_days') or [])}",
    )

    # Editor may also request reset.
    if edits.get("reset") is True:
        _log("planner_endpoint", "branch reset=true (editor)")
        store.reset(user_id, chat_id, message=msg)
        _log("planner_endpoint", "exit reset")
        return {"ok": True, "reset": True}

    _log("planner_endpoint", "build_edit_prompt")
    edit_prompt = build_edit_prompt(
        current_itinerary=current,
        user_edit_request=msg,
        edits=edits,
    )

    result = _planner_send_json_with_retry(user_id, chat_id, edit_prompt, retries=3)
    if result.get("ok") is not True:
        _log("planner_endpoint", "exit error (edit)")
        return {
            "ok": False,
            "error": result.get(
                "error", "problem fetching itinerary right now. please try again."
            ),
        }

    updated = result["data"]
    _log("planner_endpoint", "store_set_itinerary (edit)")

    store.set_itinerary(
        user_id=user_id,
        chat_id=chat_id,
        itinerary=updated,
        log_type="edit",
        message=msg,
        data={"edits": edits, "dirty_days": edits.get("dirty_days", [])},
    )

    _log("planner_endpoint", "exit success (edit)")
    return updated
