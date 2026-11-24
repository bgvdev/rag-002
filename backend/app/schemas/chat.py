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
