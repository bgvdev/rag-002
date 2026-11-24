from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.document import DocumentOut, UploadResponse
from app.services import rag_service

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    data = await file.read()  # the whole file as bytes

    try:
        return await rag_service.ingest_file(db, file.filename or "unnamed", data)
    except ValueError as e:
        # Our own errors: unsupported type, empty file
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Anything else, e.g. the embedding API failed
        raise HTTPException(status_code=502, detail=f"Upload failed: {e}")


@router.get("", response_model=list[DocumentOut])
async def list_documents(db: AsyncSession = Depends(get_db)):
    return await rag_service.list_documents(db)


@router.delete("/{document_id}")
async def delete_document(document_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await rag_service.delete_document(db, document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"deleted": document_id}
