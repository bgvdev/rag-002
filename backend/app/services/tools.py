import json
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories import chunk_repository, document_repository
from app.services import rag_service

logger = logging.getLogger(__name__)

MAX_READ_CHUNKS = 40  # read_document cap: ~40 x 500 chars = ~20,000 chars (~5k tokens)

# ---------- 1. Tool DEFINITIONS (what the LLM sees) ----------
# The LLM never sees our Python code. It only sees this JSON schema:
# a name, a description of WHEN to use it, and the arguments it accepts.
# The descriptions matter a lot: they are how the model decides to call a tool.

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "search_documents",
            "description": (
                "Search the user's uploaded documents for passages relevant to a query. "
                "Use this whenever the question might be answered by the documents. "
                "If the question has several parts, call this once per part with a focused query."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "A short, focused search query, e.g. 'refund policy time limit'.",
                    },
                    "top_k": {
                        "type": "integer",
                        "description": "How many passages to return (1-10). Default 3.",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_documents",
            "description": (
                "List all uploaded documents with their document_id and filename. "
                "Use this to see which files exist, or to find the document_id needed by read_document."
            ),
            # No arguments: an empty object schema
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_document",
            "description": (
                "Read one document's text from start to end, in order. "
                "Use this for whole-document questions such as 'summarise', 'list all topics' "
                "or 'what sections are there'. Get the document_id from list_documents first."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "document_id": {
                        "type": "integer",
                        "description": "The document_id from list_documents.",
                    },
                },
                "required": ["document_id"],
            },
        },
    },
]


# ---------- 2. Tool IMPLEMENTATIONS (what actually runs) ----------
# Normal async Python functions. Each returns a dict that we send back to the LLM.

async def search_documents(db: AsyncSession, query: str, top_k: int = 3) -> dict:
    top_k = max(1, min(int(top_k), 10))  # never trust LLM input: clamp to 1..10
    results = await rag_service.retrieve(db, query, top_k)
    return {"query": query, "results": results}


async def list_documents(db: AsyncSession) -> dict:
    documents = await document_repository.list_all(db)
    return {
        "documents": [
            {
                "document_id": d.document_id,
                "filename": d.filename,
                # datetime can't go into json.dumps(), so turn it into a string
                "created_at": d.created_at.isoformat(),
            }
            for d in documents
        ]
    }


async def read_document(db: AsyncSession, document_id: int) -> dict:
    document = await document_repository.get_by_id(db, int(document_id))
    if document is None:
        # Returned (not raised) so the LLM can call list_documents and retry
        return {"error": f"No document with document_id {document_id}. Call list_documents to see valid ids."}

    # Ask for ONE more than the cap: if we get it, we know the document was cut short
    chunks = await chunk_repository.list_by_document(db, document.document_id, MAX_READ_CHUNKS + 1)
    truncated = len(chunks) > MAX_READ_CHUNKS

    result = {
        "document_id": document.document_id,
        "filename": document.filename,
        "chunks": chunks[:MAX_READ_CHUNKS],
        "truncated": truncated,
    }
    if truncated:
        # Tell the LLM honestly, so it doesn't claim it read everything
        result["note"] = (
            f"Only the first {MAX_READ_CHUNKS} chunks are shown. "
            "Use search_documents for details from later parts."
        )
    return result


# Map tool name (string from the LLM) -> Python function
TOOL_FUNCTIONS = {
    "search_documents": search_documents,
    "list_documents": list_documents,
    "read_document": read_document,
}


# ---------- 3. DISPATCHER (LLM request -> run the right function) ----------

async def execute_tool(db: AsyncSession, name: str, arguments_json: str) -> dict:
    """Run one tool call requested by the LLM.

    Errors are RETURNED (not raised), so the LLM can read them and try again,
    e.g. with corrected arguments, instead of the whole request failing.
    """
    func = TOOL_FUNCTIONS.get(name)
    if func is None:
        return {"error": f"Unknown tool: {name}"}

    try:
        # The LLM sends arguments as a JSON *string*, e.g. '{"query": "refund"}'
        arguments = json.loads(arguments_json or "{}")
    except json.JSONDecodeError:
        return {"error": "Arguments were not valid JSON."}

    try:
        return await func(db, **arguments)
    except TypeError:
        # Wrong / missing argument names, e.g. {"q": "..."} instead of {"query": "..."}
        return {"error": f"Invalid arguments for {name}: {arguments}"}
    except Exception:
        logger.exception("Tool %s failed with arguments %r", name, arguments)
        return {"error": f"Tool {name} failed. Try a different query."}
