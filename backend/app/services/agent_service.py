import json
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.services import llm_service, tools

logger = logging.getLogger(__name__)

AGENT_SYSTEM_PROMPT = """You are a helpful assistant that answers questions about the user's uploaded documents.
You have tools. Use search_documents to find facts before answering.
Rules:
- Answer using ONLY facts returned by your tools. Do not use outside knowledge.
- For questions with several parts, search for each part separately.
- If a search finds nothing useful, try once more with different words.
- If the answer still isn't found, say: "I couldn't find that in the uploaded documents."
- Keep answers short and clear."""

MAX_STEPS = 5  # safety limit: max LLM rounds, so a confused model can't loop forever


async def run_agent(db: AsyncSession, question: str) -> dict:
    """The agent loop: LLM -> (tool calls -> results -> LLM)* -> final answer.

    Returns {"answer": str, "sources": [...], "steps": [...]}
    where "steps" records every tool call so we can show it in the UI.
    """
    # The conversation so far. It GROWS every round; the LLM sees all of it each time.
    messages: list[dict] = [
        {"role": "system", "content": AGENT_SYSTEM_PROMPT},
        {"role": "user", "content": question},
    ]
    steps: list[dict] = []
    sources: list[dict] = []

    for round_number in range(1, MAX_STEPS + 1):
        # 1. Ask the LLM: answer now, or request tool(s)?
        message = await llm_service.chat_with_tools(messages, tools.TOOL_DEFINITIONS)

        # 2. No tool calls -> this is the final answer. Done!
        if not message.tool_calls:
            return {"answer": message.content or "", "sources": sources, "steps": steps}

        # 3. Tool calls -> first, record the LLM's request in the history.
        #    The API requires this assistant message to come BEFORE the tool results.
        messages.append(
            {
                "role": "assistant",
                "content": message.content,  # usually None when calling tools
                "tool_calls": [
                    {
                        "id": call.id,
                        "type": "function",
                        "function": {
                            "name": call.function.name,
                            "arguments": call.function.arguments,
                        },
                    }
                    for call in message.tool_calls
                ],
            }
        )

        # 4. Run EVERY requested tool (there can be several = parallel tool calls).
        #    We run them one by one: they share one DB session, and an AsyncSession
        #    must not run two queries at the same time.
        for call in message.tool_calls:
            name = call.function.name
            logger.info("Round %d: tool %s(%s)", round_number, name, call.function.arguments)

            result = await tools.execute_tool(db, name, call.function.arguments)

            steps.append({"round": round_number, "tool": name, "arguments": call.function.arguments})
            for r in result.get("results", []):  # collect chunks for the UI's source list
                if r not in sources:
                    sources.append(r)

            # 5. Send the result back, linked to its request by tool_call_id
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call.id,
                    "content": json.dumps(result),  # tool content must be a string
                }
            )
        # ...then loop: the LLM now reads the results and decides again.

    # Ran out of rounds without a final answer
    logger.warning("Agent hit MAX_STEPS for question %r", question[:100])
    return {
        "answer": "Sorry, I couldn't finish answering that. Please try a simpler question.",
        "sources": sources,
        "steps": steps,
    }
