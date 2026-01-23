from fastapi import FastAPI
from routes.chat_routes import router as chat_router
from routes.planner_routes import router as planner_router

app = FastAPI()

# Register feature routers
app.include_router(planner_router)
app.include_router(chat_router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
