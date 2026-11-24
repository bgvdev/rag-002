from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chunk import Chunk
from app.models.document import Document

# Repositories only talk to the database. The service commits.


async def save_chunks(
    db: AsyncSession,
    document_id: int,
    texts: list[str],
    vectors: list[list[float]],
) -> int:
    """Save each chunk text with its vector. Returns how many were saved."""
    chunks = [
        Chunk(
            document_id=document_id,
            chunk_index=i,
            content=text,
            embedding=vector,
        )
        for i, (text, vector) in enumerate(zip(texts, vectors))
    ]
    db.add_all(chunks)
    await db.flush()
    return len(chunks)


async def search_similar(
    db: AsyncSession,
    query_vector: list[float],
    top_k: int = 3,
) -> list[dict]:
    """Find the top_k chunks whose embeddings are closest to query_vector."""
    # Cosine distance: 0 = same meaning, bigger = less similar
    distance = Chunk.embedding.cosine_distance(query_vector)

    query = (
        select(Document.filename, Chunk.content, distance.label("distance"))
        .join(Document, Chunk.document_id == Document.document_id)
        .order_by(distance)  # closest first
        .limit(top_k)
    )
    result = await db.execute(query)

    return [
        {
            "filename": row.filename,
            "content": row.content,
            "score": round(1 - row.distance, 4),  # similarity: 1 = same meaning
        }
        for row in result.all()
    ]
