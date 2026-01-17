from fastapi import FastAPI
from Planner import chat
from pydantic import BaseModel

app = FastAPI()


@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    print(request)
    response = chat.send_message(request.message)
    print(response)
    return {"response": response.text}



if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
