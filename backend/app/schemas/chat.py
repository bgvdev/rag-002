from typing import Literal

from pydantic import BaseModel, Field

MAX_HISTORY_TURNS = 20  # at most 20 earlier messages (= 10 question/answer pairs)
MAX_TURN_CHARS = 4000  # each earlier message at most 4000 characters


class ChatTurn(BaseModel):
    """One earlier message in the conversation, sent back by the frontend."""
    # Only "user" or "assistant": the client must NOT be able to send its own
    # "system" message (that would let it rewrite the agent's rules).
    role: Literal["user", "assistant"]
    content: str = Field(max_length=MAX_TURN_CHARS)


class AskRequest(BaseModel):
    """What the frontend sends to POST /chat/ask, /chat/stream, /chat/agent(/stream)"""
    question: str
    # Earlier turns, oldest first. Only the agent endpoints use it. Default: no history.
    history: list[ChatTurn] = Field(default_factory=list, max_length=MAX_HISTORY_TURNS)


class Source(BaseModel):
    """One chunk that was used to answer (filled in later, in the RAG step)"""
    filename: str
    content: str
    score: float


class AskResponse(BaseModel):
    """What the backend sends back"""
    answer: str
    sources: list[Source] = []


class ToolStep(BaseModel):
    """One tool call the agent made (shown in the UI so you can see what it did)"""
    round: int       # which LLM round asked for it (same round = parallel calls)
    tool: str        # e.g. "search_documents"
    arguments: str   # the raw JSON string the LLM sent, e.g. '{"query": "refund limit"}'


class AgentResponse(AskResponse):
    """POST /chat/agent response = a normal answer + the list of tool steps"""
    steps: list[ToolStep] = []
