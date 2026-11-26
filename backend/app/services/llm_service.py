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


async def chat_with_tools(messages: list[dict], tools: list[dict]):
    """One round of a tool-calling conversation.

    Unlike ask_llm, this takes the WHOLE message history (the agent loop keeps
    adding to it) plus the tool definitions, and returns the full message object,
    because the reply may be either:
      - text:        message.content has the answer, message.tool_calls is None
      - tool calls:  message.tool_calls is a list of {id, function: {name, arguments}}
    """
    response = await client.chat.completions.create(
        model=config.LLM_MODEL,
        messages=messages,
        tools=tools,          # the JSON schemas from tools.py
        tool_choice="auto",   # the model decides: call tool(s) or answer directly
        temperature=0.2,
    )
    return response.choices[0].message
