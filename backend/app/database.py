from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app import config

if not config.DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing in backend/.env")

# Async engine = the connection to Postgres (psycopg 3 in async mode)
engine = create_async_engine(config.DATABASE_URL)

# SessionLocal() creates a new async session = one "conversation" with the database
SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)


# Base class: every table (model) we write will inherit from this
class Base(DeclarativeBase):
    pass


async def get_db():
    """Give a route one database session, then always close it."""
    async with SessionLocal() as db:
        yield db


# Note: tables are NOT created here anymore.
# The schema is managed by Alembic migrations:  alembic upgrade head
