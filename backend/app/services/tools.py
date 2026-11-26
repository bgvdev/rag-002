import json
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.services import rag_service

logger = logging.getLogger(__name__)

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
]


# ---------- 2. Tool IMPLEMENTATIONS (what actually runs) ----------
# Normal async Python functions. Each returns a dict that we send back to the LLM.

async def search_documents(db: AsyncSession, query: str, top_k: int = 3) -> dict:
    top_k = max(1, min(int(top_k), 10))  # never trust LLM input: clamp to 1..10
    results = await rag_service.retrieve(db, query, top_k)
    return {"query": query, "results": results}


# Map tool name (string from the LLM) -> Python function
TOOL_FUNCTIONS = {
    "search_documents": search_documents,
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
