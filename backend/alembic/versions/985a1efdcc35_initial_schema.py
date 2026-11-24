"""initial schema

Revision ID: 985a1efdcc35
Revises: 
Create Date: 2026-11-24 21:22:39.028113

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import pgvector.sqlalchemy  # noqa: F401  (autogenerate writes vector columns as pgvector.sqlalchemy.Vector)


# revision identifiers, used by Alembic.
revision: str = '985a1efdcc35'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # pgvector must be enabled before creating a "vector" column
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "documents",
        sa.Column("document_id", sa.Integer(), primary_key=True),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.create_table(
        "chunks",
        sa.Column("chunk_id", sa.Integer(), primary_key=True),
        sa.Column(
            "document_id",
            sa.Integer(),
            sa.ForeignKey("documents.document_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        # 1536 is written here on purpose (not read from config):
        # a migration is a frozen snapshot of the schema at this point in time.
        sa.Column("embedding", pgvector.sqlalchemy.Vector(1536), nullable=False),
    )

    op.create_index("ix_chunks_document_id", "chunks", ["document_id"])

    op.create_index(
        "ix_chunks_embedding_hnsw",
        "chunks",
        ["embedding"],
        postgresql_using="hnsw",
        postgresql_with={"m": 16, "ef_construction": 64},
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Undo in REVERSE order: indexes, then chunks (it points to documents), then documents
    op.drop_index("ix_chunks_embedding_hnsw", table_name="chunks")
    op.drop_index("ix_chunks_document_id", table_name="chunks")
    op.drop_table("chunks")
    op.drop_table("documents")
    # The "vector" extension is left installed: other tables could be using it.
