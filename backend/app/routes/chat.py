import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.chat import AskRequest, AskResponse
from app.services import rag_service

logger = logging.getLogger(__name__)  # name = "app.routes.chat"

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/ask", response_model=AskResponse)
async def ask(request: AskRequest, db: AsyncSession = Depends(get_db)):
    # RAG: search the uploaded documents first, then ask the LLM with that context
    try:
        return await rag_service.answer_question(db, request.question)
    except Exception:
        # Full details go to the server log only, never to the user
        logger.exception("Answering failed for question %r", request.question[:100])
        raise HTTPException(
            status_code=500,
            detail="Sorry, something went wrong while answering. Please try again later.",
        )


@router.post("/stream")
async def ask_stream(request: AskRequest, db: AsyncSession = Depends(get_db)):
    # 1. Retrieval first, while the DB session is open.
    #    Errors here can still return a normal 500 (nothing has been sent yet).
    try:
        results = await rag_service.retrieve(db, request.question)
    except Exception:
        logger.exception("Retrieval failed for question %r", request.question[:100])
        raise HTTPException(
            status_code=500,
            detail="Sorry, something went wrong while answering. Please try again later.",
        )

    # 2. Stream the answer. Once streaming starts the status (200) is already sent,
    #    so errors are reported as an "error" line inside the stream instead.
    async def event_stream():
        try:
            async for line in rag_service.stream_answer(request.question, results):
                yield line
        except Exception:
            logger.exception("Streaming failed for question %r", request.question[:100])
            yield rag_service.to_ndjson(
                {"type": "error", "message": "Sorry, the answer was interrupted. Please try again."}
            )

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")
