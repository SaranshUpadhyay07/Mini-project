from fastapi import FastAPI
from Planner import send
from pydantic import BaseModel

app = FastAPI()


class ChatRequest(BaseModel):
    message: str


@app.post("/chat")
def chat_endpoint(request: ChatRequest):
    return {"response": send(request.message)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

# will start at http://0.0.0.0:8000 or http://localhost:8000