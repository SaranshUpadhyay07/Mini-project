"""
Planner endpoint using simplified MongoDB storage.
"""
import json
from typing import Any, Dict, List

from fastapi import APIRouter, Query
from pydantic import BaseModel

from agents.planner_agent import generate_itinerary
from agents.editor_agent import extract_edits, build_edit_prompt
from db.mongo import get_db
from repositories.itinerary_repository import ItineraryRepository

router = APIRouter(tags=["planner"])

FILE = "Agent/routes/planner_routes.py"

# Repository instance (initialized on first request)
_repo: ItineraryRepository | None = None


def _log(fn: str, message: str) -> None:
    print(f"[{FILE}] [{fn}] {message}", flush=True)


def _get_repo() -> ItineraryRepository:
    """Get or create repository instance."""
    global _repo
    if _repo is None:
        db = get_db()
        _repo = ItineraryRepository(db.itineraries)
        _log("_get_repo", "repository initialized")
    return _repo


def _parse_json(raw: str | None) -> Dict[str, Any]:
    """Parse JSON with error handling."""
    _log("_parse_json", "entry")

    if not raw or not raw.strip():
        _log("_parse_json", "empty or null input")
        return {
            "ok": False,
            "error": "Problem fetching itinerary right now. Please try again.",
        }

    try:
        obj = json.loads(raw.strip())
        if not isinstance(obj, dict):
            _log("_parse_json", f"invalid type: {type(obj).__name__}")
            return {
                "ok": False,
                "error": "Problem fetching itinerary right now. Please try again.",
            }
        _log("_parse_json", "success")
        return {"ok": True, "data": obj}
    except json.JSONDecodeError as e:
        _log("_parse_json", f"json decode error: {e}")
        return {
            "ok": False,
            "error": "Problem fetching itinerary right now. Please try again.",
        }


def _generate_with_retry(user_id: str, chat_id: str, message: str, retries: int = 3) -> Dict[str, Any]:
    """Generate itinerary with retry logic for JSON parsing."""
    _log("_generate_with_retry", f"entry retries={retries}")

    last_error: Dict[str, Any] | None = None

    for attempt in range(1, retries + 1):
        # Add stricter instruction on retries
        prompt = message
        if attempt > 1:
            _log("_generate_with_retry", f"retry attempt={attempt}")
            prompt = (
                "Return ONLY valid JSON (no extra text, no markdown).\n\n"
                f"USER_MESSAGE:\n{message}"
            )

        _log("_generate_with_retry", f"calling planner_agent attempt={attempt}")
        raw = generate_itinerary(user_id, chat_id, prompt)
        
        parsed = _parse_json(raw)
        if parsed.get("ok"):
            _log("_generate_with_retry", "success")
            return parsed

        last_error = parsed
        _log("_generate_with_retry", f"attempt {attempt} failed")

    _log("_generate_with_retry", "all retries failed")
    return last_error or {
        "ok": False,
        "error": "Problem fetching itinerary right now. Please try again.",
    }


class PlannerRequest(BaseModel):
    user_id: str
    chat_id: str
    message: str


@router.post("/planner")
def planner_endpoint(request: PlannerRequest) -> Dict[str, Any]:
    """
    Main planner endpoint.
    - Creates new itinerary on first message
    - Edits existing itinerary on subsequent messages
    - Handles RESET command
    """
    fn = "planner_endpoint"
    _log(fn, f"entry user_id={request.user_id} chat_id={request.chat_id}")

    repo = _get_repo()
    msg = request.message or ""

    # RESET
    if msg.strip().upper() == "RESET":
        _log(fn, "reset requested")
        repo.reset(request.user_id, request.chat_id)
        return {"ok": True, "reset": True}

    # CREATE (first message)
    if not repo.has_itinerary(request.user_id, request.chat_id):
        _log(fn, "creating new itinerary")
        
        try:
            result = _generate_with_retry(request.user_id, request.chat_id, msg)
        except Exception as e:
            error_msg = str(e)
            _log(fn, f"error during generation: {error_msg}")
            
            # Check for rate limit errors
            if "429" in error_msg or "quota" in error_msg.lower() or "RESOURCE_EXHAUSTED" in error_msg:
                return {
                    "ok": False,
                    "error": "API rate limit reached. Please try again in a few minutes.",
                    "rate_limit": True
                }
            
            # Generic error
            return {
                "ok": False,
                "error": "Problem generating itinerary. Please try again."
            }
        
        if not result.get("ok"):
            _log(fn, "creation failed")
            return {"ok": False, "error": result.get("error", "Error creating itinerary")}

        itinerary = result["data"]
        
        # Check if planner needs more info (trip_length_days = -1 means not enough info)
        trip_days = itinerary.get("meta", {}).get("trip_length_days", -1)
        if trip_days == -1 or not itinerary.get("itinerary"):
            # Don't save partial response, just return questions
            questions = itinerary.get("meta", {}).get("clarifying_questions", [])
            _log(fn, "need more info - returning questions only")
            return {
                "ok": True,
                "needs_info": True,
                "questions": questions if questions else ["Could you provide more details about your trip?"],
                "message": "I need a few more details to create your itinerary"
            }
        
        # Save complete itinerary
        repo.save(request.user_id, request.chat_id, itinerary, msg)
        _log(fn, "itinerary created and saved")
        return itinerary

    # EDIT (subsequent messages)
    _log(fn, "editing existing itinerary")
    doc = repo.get(request.user_id, request.chat_id)
    if not doc:
        _log(fn, "error: itinerary disappeared")
        return {"ok": False, "error": "Itinerary not found"}

    current = doc.get("itinerary", {})
    
    # Extract edits using editor agent
    _log(fn, "extracting edits")
    edits = extract_edits(msg)
    
    # Check if editor requested reset
    if edits.get("reset"):
        _log(fn, "editor requested reset")
        repo.reset(request.user_id, request.chat_id)
        return {"ok": True, "reset": True}

    # Build edit prompt
    _log(fn, "building edit prompt")
    edit_prompt = build_edit_prompt(
        current_itinerary=current,
        user_edit_request=msg,
        edits=edits,
    )

    # Generate updated itinerary
    try:
        result = _generate_with_retry(request.user_id, request.chat_id, edit_prompt)
    except Exception as e:
        error_msg = str(e)
        _log(fn, f"error during edit generation: {error_msg}")
        
        # Check for rate limit errors
        if "429" in error_msg or "quota" in error_msg.lower() or "RESOURCE_EXHAUSTED" in error_msg:
            return {
                "ok": False,
                "error": "API rate limit reached. Please try again in a few minutes.",
                "rate_limit": True
            }
        
        # Generic error
        return {
            "ok": False,
            "error": "Problem updating itinerary. Please try again."
        }
    
    if not result.get("ok"):
        _log(fn, "edit failed")
        return {"ok": False, "error": result.get("error", "Error updating itinerary")}

    updated = result["data"]
    repo.save(request.user_id, request.chat_id, updated, msg)
    _log(fn, "itinerary updated and saved")
    return updated


@router.get("/planner/history")
def get_history(user_id: str = Query(..., description="User ID")) -> Dict[str, Any]:
    """
    Get all past itineraries for a user.
    Returns list sorted by most recent activity.
    """
    fn = "get_history"
    _log(fn, f"entry user_id={user_id}")
    
    repo = _get_repo()
    docs = repo.list_by_user(user_id, limit=50)
    
    # Convert to simple summary format (remove _id)
    history = []
    for doc in docs:
        history.append({
            "chat_id": doc.get("chat_id"),
            "destination": doc.get("itinerary", {}).get("meta", {}).get("destination", "Unknown"),
            "trip_length_days": doc.get("itinerary", {}).get("meta", {}).get("trip_length_days", -1),
            "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
            "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
            "last_activity_at": doc.get("last_activity_at").isoformat() if doc.get("last_activity_at") else None,
        })
    
    _log(fn, f"exit found={len(history)} itineraries")
    return {"ok": True, "count": len(history), "history": history}


@router.get("/planner/{chat_id}")
def get_itinerary(
    chat_id: str,
    user_id: str = Query(..., description="User ID")
) -> Dict[str, Any]:
    """
    Get a specific itinerary by chat_id.
    """
    fn = "get_itinerary"
    _log(fn, f"entry user_id={user_id} chat_id={chat_id}")
    
    repo = _get_repo()
    doc = repo.get(user_id, chat_id)
    
    if not doc:
        _log(fn, "not found")
        return {"ok": False, "error": "Itinerary not found"}
    
    _log(fn, "exit found")
    return {
        "ok": True,
        "chat_id": doc.get("chat_id"),
        "itinerary": doc.get("itinerary"),
        "chat_history": doc.get("chat_history", []),
        "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
        "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
    }


@router.delete("/planner/{chat_id}")
def delete_itinerary(
    chat_id: str,
    user_id: str = Query(..., description="User ID")
) -> Dict[str, Any]:
    """
    Delete a specific itinerary.
    """
    fn = "delete_itinerary"
    _log(fn, f"entry user_id={user_id} chat_id={chat_id}")
    
    repo = _get_repo()
    
    # Check if exists first
    if not repo.has_itinerary(user_id, chat_id):
        _log(fn, "not found")
        return {"ok": False, "error": "Itinerary not found"}
    
    repo.reset(user_id, chat_id)
    _log(fn, "deleted")
    return {"ok": True, "message": "Itinerary deleted"}

