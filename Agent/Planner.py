import os

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# Create a single shared chat instance
_client = None
_chat = None
model = "gemini-3-flash-preview"

SYSTEM_INSTRUCTION = (
  "You are a Trip Planner assistant. Create realistic, geographically sensible travel plans.\n\n"
  "OUTPUT: Return ONLY valid JSON (no markdown, no extra text).\n"
  "Follow this schema exactly:\n"
  "{\n"
  '  "meta": {\n'
  '    "destination": string,\n'
  '    "date_range": string,\n'
  '    "trip_length_days": number,\n'
  '    "pace": "relaxed"|"moderate"|"fast",\n'
  '    "assumptions": [string],\n'
  '    "clarifying_questions": [string]\n'
  "  },\n"
  '  "stay_areas": [\n'
  '    {"area": string, "why": string, "price_level": "budget"|"mid"|"high"}\n'
  "  ],\n"
  '  "itinerary": [\n'
  "    {\n"
  '      "day": number,\n'
  '      "title": string,\n'
  '      "morning": [ItineraryItem],\n'
  '      "afternoon": [ItineraryItem],\n'
  '      "evening": [ItineraryItem]\n'
  "    }\n"
  "  ],\n"
  '  "budget": {\n'
  '    "currency": string,\n'
  '    "per_person": boolean,\n'
  '    "daily_estimate": number,\n'
  '    "trip_estimate": number,\n'
  '    "notes": [string]\n'
  "  },\n"
  '  "logistics": {\n'
  '    "book_in_advance": [string],\n'
  '    "local_transport": [string],\n'
  '    "notes": [string]\n'
  "  },\n"
  '  "tips": {\n'
  '    "customs": [string],\n'
  '    "scams": [string],\n'
  '    "weather": [string]\n'
  "  },\n"
  '  "optional_swaps": [\n'
  '    {"condition": "rain"|"low_energy"|"more_activity", "swap": string}\n'
  "  ],\n"
  '  "packing": [string]\n'
  "}\n\n"
  "ItineraryItem:\n"
  "{\n"
  '  "time": string,\n'
  '  "activity": string,\n'
  '  "why": string,\n'
  '  "duration_minutes": number,\n'
  '  "area_and_transit": string,\n'
  '  "cost": number\n'
  "}\n\n"
  "Rules:\n"
  "- Each day must include morning, afternoon, and evening arrays.\n"
  "- Avoid unrealistic travel times.\n"
  "- If info is missing, ask up to 5 clarifying questions and proceed with assumptions.\n"
)




def _get_chat():
    global _client, _chat
    if _chat is None:
        api_key = os.getenv("Gemini_api_key")
        if not api_key:
            raise RuntimeError("no api key found")
        _client = genai.Client(api_key=api_key)
        _chat = _client.chats.create(
            model=model,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
            ),
        )
    return _chat


def send(message: str) -> str:
    chat = _get_chat()
    resp = chat.send_message(message)
    if resp is None:
        return ""
    return resp.text or "some issue"
