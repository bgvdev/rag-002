import json
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.repositories import chunk_repository, document_repository
from app.schemas.chat import AskResponse, Source
from app.schemas.document import UploadResponse
from app.services import embedding_service, llm_service, text_service

SYSTEM_PROMPT = """You are a helpful assistant that answers questions using ONLY the provided context.
Rules:
- Use only facts from the context. Do not use outside knowledge.
- If the answer is not in the context, say: "I couldn't find that in the uploaded documents."
- Keep answers short and clear."""


async def ingest_file(db: AsyncSession, filename: str, data: bytes) -> UploadResponse:
    """Upload pipeline: file -> text -> chunks -> vectors -> database."""

    # 1. File bytes -> plain text  (raises ValueError for unsupported types)
    text = text_service.extract_text(filename, data)

    # 2. Text -> small overlapping chunks
    chunks = text_service.split_text(text)
    if not chunks:
        raise ValueError("No text found in this file.")

    # 3. Chunks -> vectors (done BEFORE touching the DB, so an API error saves nothing)
    vectors = await embedding_service.embed_texts(chunks)

    # 4. Save document + chunks, then commit both together (one transaction)
    document = await document_repository.create(db, filename)
    count = await chunk_repository.save_chunks(db, document.document_id, chunks, vectors)
    await db.commit()

    return UploadResponse(
        document_id=document.document_id,
        filename=document.filename,
        chunk_count=count,
    )


NO_DOCUMENTS_MESSAGE = "No documents uploaded yet. Please upload a file first."


# ---------- Shared steps (used by both normal and streaming answers) ----------

async def retrieve(db: AsyncSession, question: str, top_k: int = 3) -> list[dict]:
    """Retrieval: question -> vector -> most similar chunks from pgvector."""
    query_vector = await embedding_service.embed_text(question)
    return await chunk_repository.search_similar(db, query_vector, top_k)


def build_prompt(question: str, results: list[dict]) -> str:
    """Put the retrieved chunks + the question into one prompt for the LLM."""
    context = "\n\n".join(
        f"[Source {i}: {r['filename']}]\n{r['content']}"
        for i, r in enumerate(results, start=1)
    )
    return f"Context:\n{context}\n\nQuestion: {question}"


# ---------- Normal answer (whole answer at once) ----------

async def answer_question(db: AsyncSession, question: str, top_k: int = 3) -> AskResponse:
    """Ask pipeline: retrieve -> build prompt -> LLM answer."""
    results = await retrieve(db, question, top_k)
    if not results:
        return AskResponse(answer=NO_DOCUMENTS_MESSAGE)

    prompt = build_prompt(question, results)
    answer = await llm_service.ask_llm(prompt, system_prompt=SYSTEM_PROMPT)

    sources = [Source(**r) for r in results]
    return AskResponse(answer=answer, sources=sources)


# ---------- Streaming answer (piece by piece) ----------

def to_ndjson(event: dict) -> str:
    """One event = one line of JSON (NDJSON format)."""
    return json.dumps(event) + "\n"


async def stream_answer(question: str, results: list[dict]) -> AsyncIterator[str]:
    """Yield NDJSON lines: first the sources, then answer pieces, then 'done'.
    Retrieval is done BEFORE this (in the route), so no database is used here."""
    if not results:
        yield to_ndjson({"type": "token", "text": NO_DOCUMENTS_MESSAGE})
        yield to_ndjson({"type": "done"})
        return

    yield to_ndjson({"type": "sources", "sources": results})

    prompt = build_prompt(question, results)
    async for piece in llm_service.stream_llm(prompt, system_prompt=SYSTEM_PROMPT):
        yield to_ndjson({"type": "token", "text": piece})

    yield to_ndjson({"type": "done"})


async def list_documents(db: AsyncSession) -> list[Document]:
    return await document_repository.list_all(db)


async def delete_document(db: AsyncSession, document_id: int) -> bool:
    """Delete a document (and its chunks). Returns False if it didn't exist."""
    document = await document_repository.get_by_id(db, document_id)
    if document is None:
        return False

    await document_repository.delete(db, document)
    await db.commit()
    return True
