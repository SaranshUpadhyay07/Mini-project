import os
from google.genai import types
from google import genai
from dotenv import load_dotenv

load_dotenv()

# Create a single shared chat instance 
_client = None
_chat = None
model="gemini-3-flash-preview"

SYSTEM_INSTRUCTION = (
    "You are a Trip Planner assistant. Help users plan trips with itineraries, budgets, "
    "transport, accommodations, timing, and local tips. Ask clarifying questions when needed."
)

def _get_chat():
    global _client, _chat
    if _chat is None:
        api_key = os.getenv("Gemini_api_key")
        if not api_key:
            raise RuntimeError(
                "no api key found"
            )
        _client = genai.Client(api_key=api_key)
        _chat = _client.chats.create(
            model=model,
            config=types.GenerateContentConfig(system_instruction=SYSTEM_INSTRUCTION)
        )
    return _chat


def send(message: str) -> str:
    chat = _get_chat()
    resp = chat.send_message(message)
    if resp is None:
        return ""
    return resp.text or ""


