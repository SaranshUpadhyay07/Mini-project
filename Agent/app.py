from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.chat_routes import router as chat_router
from routes.planner_routes import router as planner_router

app = FastAPI()

# Allow browser calls from the Vite dev server (preflight OPTIONS must succeed).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register feature routers
app.include_router(planner_router)
app.include_router(chat_router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
