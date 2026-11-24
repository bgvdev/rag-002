from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.models import chunk, document  # noqa: F401  (import = register tables on Base)
from app.routes import chat, documents, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs once when the server starts
    await init_db()
    yield
    # (code after yield would run when the server stops)


# Create the FastAPI application
app = FastAPI(title="RAG API", lifespan=lifespan)

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
