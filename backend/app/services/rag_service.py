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


async def answer_question(db: AsyncSession, question: str, top_k: int = 3) -> AskResponse:
    """Ask pipeline: question -> vector -> similar chunks -> prompt -> LLM answer."""

    # 1. Question -> vector (same embedding model as the chunks)
    query_vector = await embedding_service.embed_text(question)

    # 2. Find the most similar chunks in pgvector
    results = await chunk_repository.search_similar(db, query_vector, top_k)
    if not results:
        return AskResponse(answer="No documents uploaded yet. Please upload a file first.")

    # 3. Build the context block from those chunks
    context = "\n\n".join(
        f"[Source {i}: {r['filename']}]\n{r['content']}"
        for i, r in enumerate(results, start=1)
    )
    prompt = f"Context:\n{context}\n\nQuestion: {question}"

    # 4. Ask the LLM, grounded in the context
    answer = await llm_service.ask_llm(prompt, system_prompt=SYSTEM_PROMPT)

    sources = [Source(**r) for r in results]
    return AskResponse(answer=answer, sources=sources)


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
