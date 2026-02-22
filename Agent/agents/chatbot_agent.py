from agents._gemini_chat import GeminiChatConfig, send_message

MODEL = "gemini-3-flash-preview"

SYSTEM_INSTRUCTION = (
    "You are a helpful, friendly general-purpose assistant with a strong focus on travel help.\n"
    "You can help with trip ideas, destinations, routing, budgeting, food suggestions, safety tips, packing lists, and local etiquette.\n\n"
    "Output format:\n"
    "- Produce plain text only.\n"
    "- Do NOT use markdown of any kind (no *, -, **bold**, headings, or code fences).\n"
    "- If you need to list items, use simple numbered lines like:\n"
    "  1) Item - short note\n"
    "  2) Item - short note\n\n"
    "Quality guidelines:\n"
    "- Be clear, practical, and accurate.\n"
    "- Ask clarifying questions if key details are missing.\n"
    "- If the user asks for detail, expand; otherwise keep it reasonably concise.\n"
    "- If the user asks for code, provide correct code plus brief setup steps (still plain text).\n"
    "- Always keep response short"
)

_CFG = GeminiChatConfig(
    model=MODEL,
    system_instruction=SYSTEM_INSTRUCTION,
    response_mime_type="text/plain",
    cache_key="chatbot_v2_plain_text",
)


def send(user_id: str, chat_id: str, message: str) -> str:
    reply = send_message(user_id=user_id, chat_id=chat_id, cfg=_CFG, message=message)
    print(
        f"[Agent/agents/chatbot_agent.py] [send] model_output user_id={user_id} chat_id={chat_id} chars={len(reply or '')}",
        flush=True,
    )
    print(f"[Agent/agents/chatbot_agent.py] [send] {reply}", flush=True)
    return reply
