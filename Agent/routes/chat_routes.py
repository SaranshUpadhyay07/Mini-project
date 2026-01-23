from typing import Dict

from agents.chatbot_agent import send as chatbot_send
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class ChatRequest(BaseModel):
    user_id: str
    chat_id: str
    message: str


@router.post("/chat")
def chat_endpoint(request: ChatRequest) -> Dict[str, str]:
    reply = chatbot_send(request.user_id, request.chat_id, request.message or "")
    return {"result": reply}
