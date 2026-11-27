import { useState } from "react";
import { getToolInfo } from "../../utils/toolInfo";

// The tool calls the agent made, as a chip you can open: "🔍🧩 2 steps ▾".
// Opened, it lists each call with its round and the exact arguments the LLM sent.
// Props:
//   steps       - [{ round, tool, arguments }, ...]
//                 null/undefined = normal mode (not the agent) -> show nothing
//   defaultOpen - opened or not. When it CHANGES (e.g. a newer answer arrives and
//                 this one is no longer the latest), the list follows it;
//                 in between, the user's own clicks decide.
function ToolSteps({ steps, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  // React's "adjust state when a prop changes" pattern: compare with the previous
  // value DURING render (no useEffect, so there's no extra render with the old state).
  const [prevDefaultOpen, setPrevDefaultOpen] = useState(defaultOpen);
  if (defaultOpen !== prevDefaultOpen) {
    setPrevDefaultOpen(defaultOpen);
    setOpen(defaultOpen);
  }

  if (!steps) {
    return null; // normal (non-agent) answer: there are no steps at all
  }

  if (steps.length === 0) {
    return <span className="chip">Answered without using any tools</span>;
  }

  // One icon per DIFFERENT tool used, in order of first use: 🔍🧩
  const icons = [...new Set(steps.map((step) => getToolInfo(step.tool).icon))].join("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
      <button
        type="button"
        className="chip"
        aria-expanded={open} // screen readers announce "expanded" / "collapsed"
        onClick={() => setOpen((prev) => !prev)}
      >
        {icons} {steps.length} step{steps.length === 1 ? "" : "s"} {open ? "▴" : "▾"}
      </button>

      {open && (
        <ol className="muted" style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
          {steps.map((step, index) => (
            // index is fine as key: steps are only ever appended, never reordered or removed
            <li key={index} style={{ marginTop: 4 }}>
              Round {step.round}: {getToolInfo(step.tool).icon} {step.tool}{" "}
              <code>{formatArguments(step.arguments)}</code>
            </li>
          ))}
        </ol>
      )}
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
