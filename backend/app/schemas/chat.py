from pydantic import BaseModel


class AskRequest(BaseModel):
    """What the frontend sends to POST /chat/ask"""
    question: str


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
