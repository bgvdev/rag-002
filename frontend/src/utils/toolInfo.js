// How each agent tool is shown in the UI. ONE place for all tool icons + labels:
//   - ToolSteps.jsx uses the icon in the "Agent steps" list
//   - App.jsx uses icon + label for the live loader text
// When you add a tool in backend/app/services/tools.py, add it here too.
// (A plain .js file, not a component, so exporting data from it is fine for React Refresh.)

const TOOL_INFO = {
  search_documents: { icon: "🔍", label: "Searching the documents" },
  list_documents: { icon: "📂", label: "Listing your documents" },
  read_document: { icon: "📖", label: "Reading a document" },
  get_neighbouring_chunks: { icon: "🧩", label: "Reading the text around a match" },
  delete_document: { icon: "🗑️", label: "Preparing a delete request" },
};

// Always returns { icon, label }, even for a tool that isn't listed above yet.
export function getToolInfo(toolName) {
  return TOOL_INFO[toolName] || { icon: "🔧", label: toolName };
}
