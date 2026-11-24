from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document

# Repositories only talk to the database.
# They do NOT commit - the service decides when to commit (one transaction).


async def create(db: AsyncSession, filename: str) -> Document:
    """Add a new document row and get its document_id (not committed yet)."""
    document = Document(filename=filename)
    db.add(document)
    await db.flush()  # sends the INSERT so Postgres assigns document_id
    return document


async def list_all(db: AsyncSession) -> list[Document]:
    """All documents, newest first."""
    result = await db.execute(select(Document).order_by(Document.created_at.desc()))
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, document_id: int) -> Document | None:
    """One document, or None if it doesn't exist."""
    return await db.get(Document, document_id)


async def delete(db: AsyncSession, document: Document) -> None:
    """Delete a document. Postgres deletes its chunks too (ON DELETE CASCADE)."""
    await db.delete(document)
