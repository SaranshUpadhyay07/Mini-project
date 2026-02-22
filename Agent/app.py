import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.chat_routes import router as chat_router
from routes.planner_routes import router as planner_router

app = FastAPI()

# Allow browser calls from the frontend.
# Set CORS_ORIGIN in Agent/.env for production (e.g. https://your-app.vercel.app).
# Falls back to localhost for local development.
_raw_origin = os.getenv("CORS_ORIGIN", "http://localhost:5173")
_allow_origins = [o.strip() for o in _raw_origin.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
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
