from collections.abc import AsyncIterator

from openai import AsyncOpenAI

from app import config

# One async client for the whole app. It talks to OpenRouter instead of OpenAI.
client = AsyncOpenAI(
    base_url=config.OPENROUTER_BASE_URL,
    api_key=config.OPENROUTER_API_KEY,
)


async def ask_llm(question: str, system_prompt: str = "You are a helpful assistant.") -> str:
    """Send a question to the chat model and return its text answer."""
    response = await client.chat.completions.create(
        model=config.LLM_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ],
        temperature=0.2,
    )
    return response.choices[0].message.content or ""


async def stream_llm(
    question: str, system_prompt: str = "You are a helpful assistant."
) -> AsyncIterator[str]:
    """Same as ask_llm, but yields the answer piece by piece as it is generated."""
    stream = await client.chat.completions.create(
        model=config.LLM_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ],
        temperature=0.2,
        stream=True,  # ask OpenRouter to send the answer in small pieces
    )
    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
