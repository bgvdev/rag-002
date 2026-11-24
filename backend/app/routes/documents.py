import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.document import DocumentOut, UploadResponse
from app.services import rag_service

logger = logging.getLogger(__name__)  # name = "app.routes.documents"

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    data = await file.read()  # the whole file as bytes
    filename = file.filename or "unnamed"

    try:
        result = await rag_service.ingest_file(db, filename, data)
    except ValueError as e:
        # Our own errors (unsupported type, empty file): safe to show the user
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        # Unexpected errors: full details go to the server log only
        logger.exception("Upload failed for file %r", filename)
        raise HTTPException(
            status_code=500, detail="Upload failed. Please try again later."
        )

    logger.info("Uploaded %r: %d chunks", filename, result.chunk_count)
    return result


@router.get("", response_model=list[DocumentOut])
async def list_documents(db: AsyncSession = Depends(get_db)):
    return await rag_service.list_documents(db)


@router.delete("/{document_id}")
async def delete_document(document_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await rag_service.delete_document(db, document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"deleted": document_id}
