import json

from fastapi import FastAPI, HTTPException
from Planner import send
from pydantic import BaseModel

app = FastAPI()


class ChatRequest(BaseModel):
    # Provided by your Node backend (logged-in user id); used to isolate chat context per user.
    user_id: str
    message: str


@app.post("/chat")
def chat_endpoint(request: ChatRequest):
    try:
        raw = send(request.user_id, request.message)  # JSON string
    except Exception as e:
        # Surface upstream/model errors as a 502 (bad gateway).
        raise HTTPException(status_code=502, detail=str(e))

    try:
        return json.loads(raw)  # real JSON object
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail={"error": "Model did not return valid JSON", "raw": raw},
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

# will start at http://0.0.0.0:8000 or http://localhost:8000
