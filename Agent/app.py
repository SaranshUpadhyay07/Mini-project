from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Database
from db.mongo import connect_db

# Routes
from routes.chat_routes import router as chat_router
from routes.planner_routes import router as planner_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Initialize DB connection on startup.
    """
    print("[app.py] [lifespan] startup: initializing database")
    try:
        # Connect to MongoDB
        connect_db()
        print("[app.py] [lifespan] database connected")

        yield

        print("[app.py] [lifespan] shutdown: cleaning up")
    except Exception as e:
        print(f"[app.py] [lifespan] startup error: {e}")
        raise


app = FastAPI(lifespan=lifespan, title="Trip Planner Agent API")

# MVP / testing mode: allow all origins.
# NOTE: Browsers do not allow allow_credentials=True with allow_origins=["*"].
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(planner_router)  # Main /planner endpoint
app.include_router(chat_router)  # /chat endpoint

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
