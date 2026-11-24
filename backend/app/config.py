import os
from pathlib import Path

from dotenv import load_dotenv

# backend/.env  (this file is backend/app/config.py, so go up one folder)
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(ENV_PATH)

# Read each setting from the environment (filled from .env above)
DATABASE_URL = os.getenv("DATABASE_URL")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

LLM_MODEL = os.getenv("LLM_MODEL", "openai/gpt-4o-mini")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "openai/text-embedding-3-small")

# Size of each embedding vector (must match the embedding model)
EMBEDDING_DIM = 1536
