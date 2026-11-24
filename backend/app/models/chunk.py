from pgvector.sqlalchemy import Vector
from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app import config
from app.database import Base


class Chunk(Base):
    """One small piece of a document's text, plus its embedding vector."""

    __tablename__ = "chunks"

    chunk_id: Mapped[int] = mapped_column(primary_key=True)

    # Which document this chunk belongs to.
    # ondelete="CASCADE": deleting a document also deletes its chunks.
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.document_id", ondelete="CASCADE"), index=True
    )

    # Position of this chunk inside the document (0, 1, 2, ...)
    chunk_index: Mapped[int] = mapped_column(Integer)

    # The chunk's text
    content: Mapped[str] = mapped_column(Text)

    # The embedding: 1536 numbers that represent the meaning of 'content'
    embedding = mapped_column(Vector(config.EMBEDDING_DIM), nullable=False)
