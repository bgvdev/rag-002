import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import SessionLocal, get_db
from app.schemas.chat import AgentResponse, AskRequest, AskResponse
from app.services import agent_service, rag_service

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


@router.post("/agent", response_model=AgentResponse)
async def ask_agent(request: AskRequest, db: AsyncSession = Depends(get_db)):
    # Agent: the LLM decides WHEN and WHAT to search (tool calling),
    # instead of our code always searching the raw question first.
    try:
        history = [turn.model_dump() for turn in request.history]  # Pydantic -> plain dicts
        return await agent_service.run_agent(db, request.question, history)
    except Exception:
        logger.exception("Agent failed for question %r", request.question[:100])
        raise HTTPException(
            status_code=500,
            detail="Sorry, something went wrong while answering. Please try again later.",
        )


@router.post("/agent/stream")
async def ask_agent_stream(request: AskRequest):
    # Same agent loop as /chat/agent, but each event is sent the moment it happens:
    # "step" lines while tools run, then "sources", "token" and "done".
    history = [turn.model_dump() for turn in request.history]  # Pydantic -> plain dicts

    async def event_stream():
        try:
            # The agent uses the DB during the WHOLE stream (every tool call), so the
            # generator opens its own session. It lives exactly as long as the stream,
            # instead of depending on when FastAPI closes a Depends(get_db) session.
            async with SessionLocal() as db:
                async for event in agent_service.agent_events(db, request.question, history):
                    yield rag_service.to_ndjson(event)
            yield rag_service.to_ndjson({"type": "done"})
        except Exception:
            # Status 200 was already sent, so report the error as a line in the stream
            logger.exception("Agent stream failed for question %r", request.question[:100])
            yield rag_service.to_ndjson(
                {"type": "error", "message": "Sorry, the answer was interrupted. Please try again."}
            )

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")
