from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.chat import AskRequest, AskResponse
from app.services import rag_service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/ask", response_model=AskResponse)
async def ask(request: AskRequest, db: AsyncSession = Depends(get_db)):
    # RAG: search the uploaded documents first, then ask the LLM with that context
    try:
        return await rag_service.answer_question(db, request.question)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"RAG error: {e}")
