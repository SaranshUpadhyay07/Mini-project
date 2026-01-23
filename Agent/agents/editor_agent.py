import json
import os
from typing import Any, Dict, List

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

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
      "op": "set_meta" | "set_stay_area" | "remove_activity" | "replace_activity" | "add_activity" | "note",
      "day": number | -1,
      "slot": "morning" | "afternoon" | "evening" | "NA",
      "index": number | -1,
      "value": object | string
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
- Always return valid JSON even if you need to ask questions.
""".strip()


def _client() -> Groq:
    api_key = os.getenv("Groq_api_key")
    if not api_key:
        raise RuntimeError("Groq_api_key not found in environment")
    return Groq(api_key=api_key)


def build_edit_prompt(
    *,
    current_itinerary: Dict[str, Any],
    user_edit_request: str,
    edits: Dict[str, Any],
) -> str:
    return (
        "You previously created this itinerary JSON (Odisha only). "
        "Now apply the user's requested edits.\n\n"
        "CURRENT_ITINERARY_JSON:\n"
        f"{json.dumps(current_itinerary, ensure_ascii=False)}\n\n"
        "USER_EDIT_REQUEST:\n"
        f"{user_edit_request}\n\n"
        "EDIT_OPS_JSON (for guidance):\n"
        f"{json.dumps(edits, ensure_ascii=False)}\n\n"
        "Return the updated itinerary in the same JSON schema."
    )


def extract_edits(user_message: str) -> Dict[str, Any]:

    msg = (user_message or "").strip()
    if msg.upper() == "RESET":
        return {"reset": True, "ops": [], "dirty_days": [], "questions": []}

    client = _client()

    # Ask Groq for strict JSON.
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

    return data
