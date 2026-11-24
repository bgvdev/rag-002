from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentOut(BaseModel):
    """One document, as shown in the document list."""

    # Allows building this schema straight from a SQLAlchemy Document object
    model_config = ConfigDict(from_attributes=True)

    document_id: int
    filename: str
    created_at: datetime


class UploadResponse(BaseModel):
    """What POST /documents/upload sends back."""

    document_id: int
    filename: str
    chunk_count: int
