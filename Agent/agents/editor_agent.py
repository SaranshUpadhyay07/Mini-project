import json
import os
from typing import Any, Dict, List

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

FILE = "Agent/agents/editor_agent.py"
MODEL = "openai/gpt-oss-20b"

SYSTEM_INSTRUCTION = """
You are an edit-extractor for a travel itinerary editor.

Your job:
- Read the user's message and extract intended edits as JSON operations.
- Return ONLY valid JSON. No markdown. No extra text.

If the user message is exactly "RESET" (case-insensitive, ignoring surrounding whitespace), set:
  "reset": true
and return empty ops.

Otherwise set "reset": false.

Output schema (MUST follow exactly):
{
  "reset": boolean,
  "ops": [
    {
      "op": "set_meta" | "set_stay_area" | "remove_activity" | "replace_activity" | "add_activity" | "move_activity" | "note",
      "day": number | -1,
      "slot": "morning" | "afternoon" | "evening" | "NA",
      "index": number | -1,
      "value": object | string,
      "from_day": number | -1,
      "from_slot": "morning" | "afternoon" | "evening" | "NA",
      "from_index": number | -1,
      "to_day": number | -1,
      "to_slot": "morning" | "afternoon" | "evening" | "NA"
    }
  ],
  "dirty_days": [number],
  "questions": [string]
}

Rules:
- Prefer minimal ops.
- If the user refers to a specific day, include it in dirty_days.
- If unclear which day, set day=-1, slot="NA", index=-1 and ask questions.
- "remove_activity": needs day, slot, index.
- "replace_activity": needs day, slot, index, and value containing new preferences or replacement details.
- "add_activity": needs day, slot, and value describing what to add.
- "set_meta": value may include keys like destination, date_range, trip_length_days, pace, budget, tags.
- "set_stay_area": value like {"area": "...", "price_level": "...", "why": "..."}.
- "note": use for constraints like "avoid temples", "wheelchair access", "kid-friendly", etc when not tied to a single activity.
- "move_activity": use whenever the user wants to move or swap an activity from one day (or slot) to another.
    - Set from_day, from_slot, from_index to identify the activity being moved.
    - Set to_day, to_slot to identify the destination.
    - ALWAYS add BOTH from_day and to_day to dirty_days.
    - Set day=-1, slot="NA", index=-1 (the generic fields are unused for move_activity).
    - value may contain override details for the moved activity, or {} if unchanged.
- MOVE CONSISTENCY RULE: When a move_activity op is present, both the source day and the destination day
  will be fully regenerated. The source day must have the activity removed and replaced with something
  appropriate. The destination day must gain the moved activity. Never leave a day with a gap.
- Always return valid JSON even if you need to ask questions.
""".strip()


def _log(fn: str, message: str) -> None:
    # Simple terminal tracing. Avoids printing secrets.
    print(f"[{FILE}] [{fn}] {message}", flush=True)


def _client() -> Groq:
    api_key = os.getenv("Groq_api_key")
    if not api_key:
        _log("_client", "error missing Groq_api_key in environment")
        raise RuntimeError("Groq_api_key not found in environment")
    _log("_client", "creating Groq client")
    return Groq(api_key=api_key)


def _has_move_ops(edits: Dict[str, Any]) -> bool:
    return any(op.get("op") == "move_activity" for op in (edits.get("ops") or []))


def _move_ops_summary(edits: Dict[str, Any]) -> str:
    """Return a human-readable summary of each move_activity op for the prompt."""
    lines = []
    for op in edits.get("ops") or []:
        if op.get("op") != "move_activity":
            continue
        fd = op.get("from_day", "?")
        fs = op.get("from_slot", "?")
        fi = op.get("from_index", "?")
        td = op.get("to_day", "?")
        ts = op.get("to_slot", "?")
        lines.append(f"  - Move activity at Day {fd} / {fs}[{fi}]  →  Day {td} / {ts}")
    return "\n".join(lines) if lines else ""


def build_edit_prompt(
    *,
    current_itinerary: Dict[str, Any],
    user_edit_request: str,
    edits: Dict[str, Any],
) -> str:
    move_section = ""
    if _has_move_ops(edits):
        summary = _move_ops_summary(edits)
        move_section = (
            "\n\nMOVE CONSISTENCY RULES (MANDATORY — moves detected):\n"
            "One or more activities are being moved between days. You MUST:\n"
            "1. ADD the activity to the destination day/slot.\n"
            "2. REMOVE the activity from the source day/slot.\n"
            "3. FILL the gap left in the source day with a geographically and "
            "logistically appropriate replacement activity so that day remains complete.\n"
            "4. Ensure every day still has morning, afternoon, and evening arrays with at least one item each.\n"
            "5. Do NOT leave any day with fewer activities than before unless the user explicitly asked to remove something.\n"
            f"\nMoves to apply:\n{summary}\n"
        )

    return (
        "You previously created this itinerary JSON (Odisha only). "
        "Now apply the user's requested edits.\n\n"
        "CURRENT_ITINERARY_JSON:\n"
        f"{json.dumps(current_itinerary, ensure_ascii=False)}\n\n"
        "USER_EDIT_REQUEST:\n"
        f"{user_edit_request}\n\n"
        "EDIT_OPS_JSON (for guidance):\n"
        f"{json.dumps(edits, ensure_ascii=False)}\n"
        f"{move_section}\n"
        "Return the updated itinerary in the same JSON schema."
    )


def extract_edits(user_message: str) -> Dict[str, Any]:

    fn = "extract_edits"
    _log(fn, "entry")

    msg = (user_message or "").strip()
    _log(fn, f"input received (len={len(msg)})")

    if msg.upper() == "RESET":
        _log(fn, "branch RESET=true")
        _log(fn, "exit")
        return {"reset": True, "ops": [], "dirty_days": [], "questions": []}

    client = _client()

    # Ask Groq for strict JSON.
    _log(fn, f"groq_call model={MODEL}")
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_INSTRUCTION},
            {"role": "user", "content": msg},
        ],
        temperature=0.2,
        max_tokens=600,
    )

    content = (resp.choices[0].message.content or "").strip()

    # Print model output to terminal as requested (truncated).
    preview = content if len(content) <= 2000 else (content[:2000] + "...(truncated)")
    _log(fn, "model_output_begin")
    print(preview, flush=True)
    _log(fn, "model_output_end")

    # Parse and minimally validate/normalize.
    data = json.loads(content)

    if "reset" not in data:
        data["reset"] = False
    if "ops" not in data or not isinstance(data["ops"], list):
        data["ops"] = []
    if "dirty_days" not in data or not isinstance(data["dirty_days"], list):
        data["dirty_days"] = []
    if "questions" not in data or not isinstance(data["questions"], list):
        data["questions"] = []

    # Ensure questions are strings (defensive).
    data["questions"] = [str(q) for q in data["questions"]]

    # Ensure dirty_days are ints when possible.
    normalized_days: List[int] = []
    for d in data["dirty_days"]:
        try:
            normalized_days.append(int(d))
        except Exception:
            continue
    data["dirty_days"] = normalized_days

    _log(
        fn,
        f"parsed output reset={data.get('reset')} ops={len(data.get('ops', []))} dirty_days={len(data.get('dirty_days', []))} questions={len(data.get('questions', []))}",
    )
    _log(fn, "exit")
    return data
