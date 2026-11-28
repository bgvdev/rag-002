import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import chat, documents, health

# Logging: print our app's log messages in the terminal (with time + level + file)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

# Create the FastAPI application
# (database tables are created/updated by Alembic: run "alembic upgrade head")
app = FastAPI(
    title="DocChat API",
    description="Chat with your documents. Every answer cites its source.",
)

# CORS: allow the React dev server (Vite runs on port 5173) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers (each file in app/routes/ has its own router)
app.include_router(health.router)
app.include_router(chat.router)
app.include_router(documents.router)
