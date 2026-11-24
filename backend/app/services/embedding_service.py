from openai import AsyncOpenAI

from app import config

# Same OpenRouter key + URL as the LLM, but we call the embeddings endpoint
client = AsyncOpenAI(
    base_url=config.OPENROUTER_BASE_URL,
    api_key=config.OPENROUTER_API_KEY,
)

BATCH_SIZE = 100  # send at most 100 texts per API call


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Turn many texts into vectors (one vector of 1536 numbers per text)."""
    vectors: list[list[float]] = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        response = await client.embeddings.create(
            model=config.EMBEDDING_MODEL,
            input=batch,
        )
        vectors.extend(item.embedding for item in response.data)

    return vectors


async def embed_text(text: str) -> list[float]:
    """Turn one text (e.g. the user's question) into a vector."""
    vectors = await embed_texts([text])
    return vectors[0]
