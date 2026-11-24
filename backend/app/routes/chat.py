import logging

from fastapi import APIRouter, Depends, HTTPException
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
