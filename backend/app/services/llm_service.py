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
