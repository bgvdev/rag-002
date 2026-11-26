// Shows the tool calls the agent made, so you can see HOW it found the answer.
// Props:
//   steps - [{ round, tool, arguments }, ...] from POST /chat/agent
//           null/undefined = normal mode (not the agent) -> show nothing
function ToolSteps({ steps }) {
  if (!steps) {
    return null; // normal (non-agent) answer: there are no steps at all
  }

  if (steps.length === 0) {
    return <p className="muted">🤖 Answered without using any tools.</p>;
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <strong>Agent steps</strong>
      <ol style={{ marginTop: 6 }}>
        {steps.map((step, index) => (
          // index is fine as key: this list is replaced, never reordered or edited
          <li key={index}>
            <span className="muted">Round {step.round}:</span> 🔍 {step.tool}{" "}
            <code>{formatArguments(step.arguments)}</code>
          </li>
        ))}
      </ol>
    </div>
  );
}

// '{"query":"refund","top_k":10}'  ->  'query: "refund", top_k: 10'
// The LLM wrote this string, so it might not be valid JSON: fall back to the raw text.
function formatArguments(argumentsJson) {
  try {
    const args = JSON.parse(argumentsJson);
    return Object.entries(args)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(", ");
  } catch {
    return argumentsJson;
  }
}

export default ToolSteps;
