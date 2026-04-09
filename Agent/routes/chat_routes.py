from typing import Dict

from agents.chatbot_agent import send as chatbot_send
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

FILE = "Agent/routes/chat_routes.py"


class ChatRequest(BaseModel):
    user_id: str
    chat_id: str
    message: str


@router.post("/chat")
def chat_endpoint(request: ChatRequest) -> Dict[str, str]:
    fn = "chat_endpoint"
    msg = request.message or ""
    print(
        f"[{FILE}] [{fn}] entry user_id={request.user_id} chat_id={request.chat_id} message_len={len(msg)}",
        flush=True,
    )

    try:
        reply = chatbot_send(request.user_id, request.chat_id, msg)
    except Exception as e:
        print(f"[{FILE}] [{fn}] error: {e}", flush=True)
        error_str = str(e)
        
        # Handle specific error types
        if "429" in error_str or "quota" in error_str.lower() or "RESOURCE_EXHAUSTED" in error_str:
            error_msg = "API rate limit reached. Please try again in a few minutes."
        elif "503" in error_str or "UNAVAILABLE" in error_str:
            error_msg = "The AI service is temporarily overloaded. Please try again in a few seconds."
        else:
            error_msg = "I'm experiencing high demand right now. Please try again in a moment."
        
        return {"result": error_msg}

    # Print model output to terminal as requested (truncated to keep logs readable)
    preview = (reply or "").replace("\n", "\\n")
    if len(preview) > 500:
        preview = preview[:500] + "...(truncated)"
    print(f"[{FILE}] [{fn}] model_reply {preview}", flush=True)
    print(f"[{FILE}] [{fn}] exit", flush=True)

    return {"result": reply}
